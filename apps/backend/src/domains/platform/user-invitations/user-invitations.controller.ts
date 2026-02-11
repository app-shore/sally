import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { UserInvitationsService } from './user-invitations.service';
import { InviteUserDto, AcceptInvitationDto } from './dto/invite-user.dto';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { Public } from '../../../auth/decorators/public.decorator';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@Controller('invitations')
export class UserInvitationsController {
  constructor(
    private readonly userInvitationsService: UserInvitationsService,
  ) {}

  /**
   * Invite a new user (OWNER and ADMIN)
   * SUPER_ADMIN manages tenants through tenant registration, not user invitations
   */
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Post()
  async inviteUser(
    @Body() dto: InviteUserDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.userInvitationsService.inviteUser(dto, currentUser);
  }

  /**
   * Get all invitations for tenant (OWNER and ADMIN only)
   * SUPER_ADMIN manages tenants, not individual users
   */
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Get()
  async getInvitations(
    @CurrentUser() currentUser: any,
    @Query('status') status?: string,
  ) {
    return this.userInvitationsService.getInvitations(
      currentUser.tenantId,
      status,
    );
  }

  /**
   * Get invitation details by token (PUBLIC - for acceptance page)
   */
  @Public()
  @Get('by-token/:token')
  async getInvitationByToken(@Param('token') token: string) {
    return this.userInvitationsService.getInvitationByToken(token);
  }

  /**
   * Accept invitation (PUBLIC)
   */
  @Public()
  @Post('accept')
  async acceptInvitation(@Body() dto: AcceptInvitationDto) {
    return this.userInvitationsService.acceptInvitation(
      dto.token,
      dto.firebaseUid,
    );
  }

  /**
   * Cancel invitation (OWNER and ADMIN)
   */
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Delete(':invitationId')
  async cancelInvitation(
    @Param('invitationId') invitationId: string,
    @CurrentUser() currentUser: any,
    @Body('reason') reason?: string,
  ) {
    return this.userInvitationsService.cancelInvitation(
      invitationId,
      currentUser.tenantId,
      reason,
    );
  }

  /**
   * Resend invitation with new token (OWNER and ADMIN)
   */
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Post(':invitationId/resend')
  async resendInvitation(
    @Param('invitationId') invitationId: string,
    @CurrentUser() currentUser: any,
  ) {
    return this.userInvitationsService.resendInvitation(
      invitationId,
      currentUser.tenantId,
    );
  }
}
