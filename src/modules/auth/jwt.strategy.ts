import { PassportStrategy } from '@nestjs/passport';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserService } from '../user/user.service';
import { SecretService } from '../aws/aws-secrets.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private userService: UserService,
        // private userFeatureActionService: UserFeatureActionService,
        private secretService: SecretService
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKeyProvider: async (request, rawJwtToken, done) => {
                try {
                    // Fetch the secret using SecretService
                    const secret = await secretService.getSecret('APP_SECRET');
                    done(null, secret);
                } catch (err) {
                    done(err);
                }
            }
        });
    }

}
