// // import { forwardRef, Module } from '@nestjs/common';
// // import { TypeOrmModule } from '@nestjs/typeorm';
// // import { BranchService } from './branch.service';
// // import { BranchController } from './branch.controller';
// // import { Branch } from './entities/branch.entity';
// // import { User } from '@modules/user/user.entity';
// // import { UserModule } from '@modules/user/user.module';
// // @Module({
// //     imports: [
// //         TypeOrmModule.forFeature([Branch, User]),
// //         forwardRef(() => UserModule),
// //     ],
// //     controllers: [BranchController],
// //     providers: [BranchService,],
// //     exports: [BranchService]
// // })
// // export class BranchModule {}
// import { Module, forwardRef } from '@nestjs/common';
// import { TypeOrmModule } from '@nestjs/typeorm';
// import { Branch } from './entities/branch.entity';
// import { BranchService } from './branch.service';
// import { BranchController } from './branch.controller';
// import { UserModule } from '@modules/user/user.module';

// @Module({
//   imports: [TypeOrmModule.forFeature([Branch]), forwardRef(() => UserModule)],
//   controllers: [BranchController],
//   providers: [BranchService],
//   exports: [BranchService],
// })
// export class BranchModule {}
import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Branch } from './entities/branch.entity';
import { BranchService } from './branch.service';
import { BranchController } from './branch.controller';
import { User } from '@modules/user/user.entity';
import { UserModule } from '@modules/user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Branch, User]),
    forwardRef(() => UserModule),
  ],
  controllers: [BranchController],
  providers: [BranchService],
  exports: [BranchService],
})
export class BranchModule {}
