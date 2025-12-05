import {
    Injectable,
    UnauthorizedException,
    ConflictException,
    HttpException,
    HttpStatus,
    NotAcceptableException,
    NotFoundException,
    forwardRef,
    Inject,
    BadRequestException,
    Logger,
    InternalServerErrorException
} from '@nestjs/common';
import { UserRegisterDto } from '../user/dto/user-register-dto';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import { User } from '../user/user.entity';
import {
    Features,
    Roles,
    STRATEGIES,
    USER_STATUS,
    createPasswordHash,
    generateOTP,
    refineCustomLogs
} from '../../utils/app.utils';
import { ReferenceService } from '../reference/reference.service';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Like, Repository } from 'typeorm';
import { LogService } from '../log/log.service';
import { NotificationService } from '../notification/notification.service';
import { ConfigService } from '@nestjs/config';
import { TokenService } from './tokens.service';
import { MediaService } from '../media/media.service';
import { RoleService } from '../role/role.service';
import { getLogger } from 'src/utils/winstonLogger';
import { OnEvent } from '@nestjs/event-emitter';
import { SecretService } from '../aws/aws-secrets.service';
import { invitationLinkForClient } from 'src/utils/email-templates/invitation-link/client';
import { resetLink } from 'src/utils/email-templates/reset-password';
import axios from 'axios';
import { compare } from 'bcryptjs';
import { Corporate } from '@modules/company/entities/corporate.entity';
import { sendOtpForForgotPassword } from 'src/utils/email-templates/otp/login';
import { EmailService } from '@modules/email/email.service';
import { InsuranceRolePermission } from '@modules/insurance-role-permission/entities/insurance-role-permission.entity';

@Injectable()
export class AuthService {
    constructor(
        private configService: ConfigService,
        @Inject(forwardRef(() => UserService))
        private userService: UserService,
        private referenceService: ReferenceService,
        private logService: LogService,
        private jwtService: JwtService,
        private mediaService: MediaService,
        @Inject(forwardRef(() => NotificationService))
        private notifyService: NotificationService,
        private tokenService: TokenService,
        // @Inject(forwardRef(() => RoleFeatureActionService))
        // private roleFeatureActionService: RoleFeatureActionService,
        @InjectRepository(User)
        private userRepository: Repository<User>,
        private roleService: RoleService,
        private secretService: SecretService,
        // private userFeatureActionService: UserFeatureActionService,
        @InjectRepository(Corporate)
        private corporateService: Repository<Corporate>,
        private emailService: EmailService,
        @InjectRepository(InsuranceRolePermission)
        private insRolePermissionRepo: Repository<InsuranceRolePermission>
    ) {}

    async resendOTP(email: string): Promise<any> {
        const dbUser = await this.userService.findOneByEmail(email);
        if (!dbUser) throw new NotFoundException(['User Not Found']);

        const newOTP = generateOTP();
        await this.userService.findAndUpdate(dbUser.email, { otp: newOTP });
        await this.notifyService.sendOTP(dbUser.email, newOTP);

        return await this.generateJWT({ email: dbUser.email }, 'otp', '1d');
    }

    async validateUser(email: string, password: string): Promise<any> {
        const user = await this.getUserNamePassword(email, password);

        let isMatch: any;
        if (user) {
            isMatch = password === user.password;

            if (isMatch) {
                const { password, ...rest } = user;
                return rest;
            }
        }

        return null;
    }

    async validateUserViaId(username: string, password: string): Promise<any> {
        const user = await this.getUserNamePasswordViaId(username, password);
        let isMatch: any;
        if (user) {
            isMatch = password === user.password;

            if (isMatch) {
                const { password, ...rest } = user;
                return rest;
            }
        }

        return null;
    }

    async generateJWT(user: any, category: string, expiresIn: string = '2d') {
        const payload = {
            email: user?.email,
            forRoutes: category // category can have value => (all/otp)
        };

        return this.jwtService.sign(payload, { expiresIn });
    }

    async generateJWTViaId(user: { genericId: string; userType: string }, category: string, expiresIn: string = '30d') {
        // Logger.log('generating jwt', user);
        const payload = {
            genericId: user.genericId,
            userType: user.userType,
            forRoutes: category // category can have value => (all/otp)
        };

        return this.jwtService.sign(payload, { expiresIn });
    }

    async getUserNamePasswordViaId(username: string, password: string): Promise<User | null> {
        const userRepo = this.userRepository;

        // Attempt to find user joined with Employee
        let user = await userRepo
            .createQueryBuilder('user')
            .leftJoinAndSelect('user.employee', 'employee')
            .where('employee.id = :username', { username })
            .andWhere('user.password = :password', { password })
            .getOne();

        // If not found, try with Client
        if (!user) {
            user = await userRepo
                .createQueryBuilder('user')
                .leftJoinAndSelect('user.client', 'client')
                .where('client.id = :username', { username })
                .andWhere('user.password = :password', { password })
                .getOne();
        }

        return user;
    }

    async getUserNamePassword(email: string, password: string): Promise<User> {
        return await this.userRepository.findOne({
            where: {
                email: Like(`%${String(email).toLowerCase()}%`),
                password: password
            }
        });
    }



    async loginBypassOTP(req: any): Promise<any> {
        const user = req.user;
        Logger.log(user);

        if (!user) {
            throw new NotAcceptableException(['Invalid Token']);
        }

        // Reject inactive staff
        if ([Roles.operation].includes(user.userType as Roles) && user.status === USER_STATUS.IN_ACTIVE) {
            throw new BadRequestException('In-Active User cannot be logged in.');
        }

        const genericId = user.userType === Roles.operation ? user.client.id : user.employee.id;
        const payload = {
            genericId: user.clientId || user.employeeId || user.id.toString(),
            userType: user.userType || 'client',
            forRoutes: 'all'

            // Add other fields if needed
        };
        // Generate new access token directly
        return this.jwtService.sign(payload, {
            secret: await this.secretService.getSecret('JWT_ACCESS_SECRET'),
            expiresIn: '1d' // Set the token expiration time
        });
    }



    async verifyForgotPass(params: any, res: any): Promise<any> {
        const user = await this.userService.findOneById(parseInt(params.id));

        if (!user) throw new NotFoundException(['User does not exist']);

        const secret = (await this.secretService?.getSecret('JWT_ACCESS_SECRET')) + user.password;

        const payload = await this.jwtService.verify(params.token, { secret });
        if (!payload) throw new UnauthorizedException(['Not Allowed..']);

        const targetUrl = `${await this.secretService?.getSecret('APP_URL')}/reset-password`;
        const redirectUrl = targetUrl + '?' + new URLSearchParams(params).toString();

        res.redirect(302, redirectUrl);
    }

    async resetPass(data: any, authorizationHeader: string): Promise<any> {
        if (!authorizationHeader) throw new UnauthorizedException(['Not Authorized..']);

        const [, token] = authorizationHeader.split('Bearer ');
        if (!token) throw new UnauthorizedException(['Not Authorized..']);

        const user = await this.userService.findOneById(parseInt(data.id));
        if (!user) throw new NotFoundException(['User does not exist']);

        const secret = (await this.secretService?.getSecret('JWT_ACCESS_SECRET')) + user.password;
        const payload = await this.jwtService.verify(token, { secret });
        if (!payload) throw new UnauthorizedException(['Not allowed..']);

        user.password = data.password;

        const { password, accessToken, refreshToken, ...rest } = await this.userRepository.save(user);

        return rest;
    }



    async delete(email: string): Promise<any> {
        if (email === 'tahir@insighttherapy.us') {
            const dbUser = await this.userService.findOneByEmail(email);
            if (!dbUser) throw new NotFoundException(['Already Deleted..']);

            return await this.userService.removeByEmail(email);
        }
    }

    async testCookie(res: any): Promise<any> {
        const token = await this.secretService?.getSecret('JWT_ACCESS_SECRET');
        res.cookie('testCookie', token, { httpOnly: true, secure: true, maxAge: 86400000 }); // Example: 1 day expiration
        res.send('Cookie set successfully');
    }

    async handleRefreshToken(req: any, res: any): Promise<any> {
        const cookies = req.cookies;
        if (!cookies?.jwt) throw new UnauthorizedException(['Not Authorized..']);
        const refreshToken = cookies.jwt;
        res.clearCookie('jwt', { httpOnly: true, sameSite: 'None', secure: true });

        const foundUser = await this.userRepository.findOneBy({ refreshToken });
        let decoded: any = null;

        // Detected refresh token reuse!
        if (!foundUser) {
            try {
                decoded = await this.jwtService.verify(refreshToken, {
                    secret: await this.secretService?.getSecret('JWT_REFRESH_SECRET')
                });

                const hackedUser = await this.userRepository.findOneBy({ email: decoded.email });
                hackedUser.refreshToken = null;
                hackedUser.accessToken = null;
                const result = await this.userRepository.save(hackedUser);
                // console.log(result);
            } catch (error) {
                if (!decoded) throw new UnauthorizedException(['Not Found hacked-User..']);
                throw error;
            }

            throw new UnauthorizedException(['Un-Authorized..']); //Un-Authorized
        }

        // evaluate jwt
        try {
            decoded = await this.jwtService.verify(refreshToken, {
                secret: await this.secretService?.getSecret('JWT_REFRESH_SECRET')
            });
        } catch (error) {
            foundUser.refreshToken = null;
            const result = await this.userRepository.save(foundUser);
            // console.log(result);
            if (!decoded) throw new UnauthorizedException(['Un-Authorized..']);
            throw error;
        }

        // Refresh token was still valid
        const accessToken = await this.tokenService.generateJWT({ email: foundUser.email }, STRATEGIES.ACCESS);
        const newRefreshToken = await this.tokenService.generateJWT({ email: foundUser.email }, STRATEGIES.REFRESH);

        foundUser.accessToken = accessToken;
        foundUser.refreshToken = newRefreshToken;
        await this.userRepository.save(foundUser);

        // Creates Secure Cookie with refresh token
        res.cookie('jwt', newRefreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'None',
            maxAge: 30 * 24 * 60 * 60 * 1000
        });

        return accessToken;
    }

    async getHoursTokenFromStart(user: User, date: moment.Moment, amount: number) {
        const expiry = date.clone().add(amount, 'hours').unix();

        const secret = await this.secretService?.getSecret('JWT_ACCESS_SECRET');
        const customJwtService = new JwtService({ secret });
        const payload = {
            id: user?.id,
            exp: expiry
        };
        return customJwtService.sign(payload);
    }

    async loginUserApi(reqBody: any, req: any): Promise<any> {
        // let user = await this.userRepository.findOne({
        //     where: {
        //         email: reqBody.email,
        //         corporate: {
        //             id: 1
        //         }
        //     },
        //     relations: ['corporate']
        // });
        console.log("request body in login api service", reqBody);
        const detailedUser = await this.userRepository.findOne({
            where: {
                 email: reqBody.email
            },
            relations: ['userRole', 'corporate', 'state', 'branch']
        });
console.log("detailedUser---", detailedUser);
        if (!detailedUser) throw new NotAcceptableException(['User not found']);

        if (detailedUser?.status === USER_STATUS.IN_ACTIVE) {
            throw new BadRequestException('In-Active User cannot be logged in.');
        }

        const isMatch = await compare(reqBody.password, detailedUser?.password);
        if (!isMatch) {
            throw new BadRequestException('wrong password');
        }

        // const detailedUser = await this.userRepository.findOne({
        //     where: {
        //         id: user.id,
        //         corporate: { id: 1 }
        //     },
        //     relations: ['userRole', 'corporate', 'state', 'branch']
        // });

        // console.log("this is db user---", detailedUser);
        console.log("checking point 1 detailedUser", detailedUser);
        

        // const dbRole = await this.roleService.findOneById(Number(detailedUser.userType));
        const roleId = detailedUser.userRole?.id;
        const roleName = detailedUser.userRole?.roleName ?? null;

        // const roleName = dbRole?.roleName ?? null;

        const permissionResult = await this.userRepository.query('CALL get_roleAccess(?)', [roleName]);
        const permissionsByType = permissionResult[0].reduce((acc, { type, name }) => {
            if (!acc[type]) acc[type] = [];
            acc[type].push(name);
            return acc;
        }, {});
        //   console.log('permissionsByType===========', permissionsByType);

        const token = await this.generateJWT(detailedUser, 'all');
        return {
            token,
            isAuthenticated: true,
            user: {
                ...detailedUser,
                //features: user.allPermissions ?? null,
                // role: dbRole ? { name: roleName, id: dbRole.id } : null,
                role: detailedUser.userRole ? { name: roleName, id: roleId } : null,
                permissions: permissionsByType
            }
        };
    }

    async verifyAccessToken(req: any, res: any): Promise<any> {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        // console.log('in verify access token service token is here ', token);

        if (!token) return res.status(401).json({ isAuthorized: false });
        let responseData = null;
        let decoded: any = null;
        decoded = await this.jwtService.verify(token, {
            secret: await this.secretService?.getSecret('JWT_ACCESS_SECRET')
        });
        // console.log('decoded', decoded);
console.log("checking point after verify access token 2");

        const foundUser = await this.userRepository.findOneBy({ email: decoded.email });
        if (!foundUser) {
            throw new UnauthorizedException(['Not Found User..']);
        } else {
            responseData = {
                isAuthorized: true,
                user: foundUser,
                accessToken: foundUser.accessToken,
                email: foundUser.email,
                id: foundUser.id
            };
        }
        try {
        } catch (err) {
            // console.log(' - verifyAccessToken - error during in verifyAccessToken', err.message);
            throw new UnauthorizedException(['Not Found User..']);
        }
    }

   
    async changeInsuranceUserPassword(reqBody: any, req: any): Promise<any> {
        try {
            const { email, oldPassword, newPassword } = reqBody;

            const corporate = await this.corporateService.findOneBy({ id: 1 });
            // console.log('in change password service company', company);

            let user = await this.userRepository.findOne({
                where: {
                    email,
                    corporate: { id: corporate.id }
                },
                relations: ['corporate']
            });
            // console.log('user in change password service', user);

            if (!user) {
                throw new NotAcceptableException(['User not found']);
            }
            const hashedNewPassword = await createPasswordHash(reqBody.newPassword);
            user.password = hashedNewPassword;
            const result = await this.userRepository.save(user);
            return {
                status: 'success',
                message: 'Password changed successfully',
                data: result
            };

            if (user.otp === reqBody.otp) {
                const currentDate = new Date(); // Current date and time
                const otpValidity = new Date(user.otpCreatedAt.getTime() + 5 * 60000);
                // console.log('otp validy is ', otpValidity);
                if (currentDate > otpValidity) {
                    return {
                        status: 'error',
                        message: 'OTP has expired. Please request a new OTP',
                        data: null
                    };
                } else {
                    const hashedNewPassword = await createPasswordHash(reqBody.newPassword);
                    user.password = hashedNewPassword;
                    const result = await this.userRepository.save(user);
                    if (!result) {
                        throw new BadRequestException('Error in changing password');
                    }
                    return {
                        status: 'success',
                        message: 'Password changed successfully',
                        data: null
                    };
                }
            } else {
                return {
                    status: 'error',
                    message: 'Invalid OTP',
                    data: null
                };
            }
        } catch (error) {
            console.error('Error in changeInsuranceUserPassword:', error);
            // If it's already a known exception, rethrow it
            if (error instanceof BadRequestException || error instanceof NotAcceptableException) {
                throw error;
            }

            // Otherwise throw a generic error
            throw new InternalServerErrorException('An unexpected error occurred while changing the password.');
        }
    }

    async otpForResetPassword(reqBody: any, req: any): Promise<any> {
        try {
            const { email } = reqBody;
            // console.log('email', email);

            const corporate = await this.corporateService.findOneBy({ id: 1 });

            const user = await this.userRepository.findOne({
                where: {
                    email,
                    corporate: { id: corporate.id }
                },
                relations: ['corporate']
            });

            if (!user) {
                throw new NotAcceptableException(['User not found']);
            }
            const otp = generateOTP();
            user.otp = otp;
            user.otpCreatedAt = new Date();
            const savedUser = await this.userRepository.save(user);
            if (savedUser) {
                // console.log('otp', otp);
                let htmlContent = sendOtpForForgotPassword(email, otp, user.firstName);
                const mailedData = await this.emailService.sendEmail(email, 'Reset Password', htmlContent);
                // console.log('mailedData', mailedData);

                if (!mailedData) {
                    throw new InternalServerErrorException('Email not sent');
                }
                return {
                    status: 'success',
                    message: 'Email send successfully',
                    data: null
                };
            }
        } catch (error) {
            console.error('Error in otpForResetPassword:', error);
            // If it's already a known exception, rethrow it
            if (error instanceof BadRequestException || error instanceof NotAcceptableException) {
                throw error;
            }

            // Otherwise throw a generic error
            throw new InternalServerErrorException('An unexpected error occurred while sending otp.');
        }
    }
}
