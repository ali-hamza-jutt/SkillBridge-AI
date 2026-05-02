import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ConversationsService } from './conversations.service';
import { CreatePreHireConversationDto } from './dto/create-pre-hire-conversation.dto';
import { HireConversationDto } from './dto/hire-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';

@ApiTags('Conversations')
@UseGuards(JwtAuthGuard)
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get('me')
  getMyConversations(@Req() req) {
    return this.conversationsService.findMyConversations(req.user.userId);
  }

  @Post('pre-hire')
  createPreHire(@Body() dto: CreatePreHireConversationDto, @Req() req) {
    return this.conversationsService.createOrOpenPreHireConversation(
      dto.taskId,
      dto.bidId,
      req.user.userId,
    );
  }

  @Post('hire')
  hire(@Body() dto: HireConversationDto, @Req() req) {
    return this.conversationsService.hireConversation(
      dto.taskId,
      dto.bidId,
      req.user.userId,
    );
  }

  @Get(':id')
  getConversation(@Param('id') id: string, @Req() req) {
    return this.conversationsService.getConversation(id, req.user.userId);
  }

  @Get(':id/messages')
  getMessages(
    @Param('id') id: string,
    @Req() req,
    @Query('before') before?: string,
    @Query('limit') limit?: string,
  ) {
    return this.conversationsService.getMessages(
      id,
      req.user.userId,
      limit ? Number(limit) : 50,
      before,
    );
  }

  @Post(':id/messages')
  sendMessage(
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
    @Req() req,
  ) {
    return this.conversationsService.sendMessage(id, req.user.userId, dto.body, dto.attachments);
  }
}
