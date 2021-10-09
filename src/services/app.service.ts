import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

import { NotificationTypes } from 'src/enums/notification-types.enum';
import { Stage } from 'src/enums/stage.enum';
import IEvaluationPeriodFinishedParams from 'src/interfaces/evaluation-period-finished-params.interface';
import IGroup from 'src/interfaces/group.interface';
import IUser from 'src/interfaces/user.interface';
import IMessageGenerator from 'src/interfaces/message-map-item.interface';

import IMessagePayload from 'src/interfaces/message-payload.interface';
import IPeriodAboutToFinishParams from 'src/interfaces/period-about-to-finish-params.interface';
import IUserPerformedActionParams from 'src/interfaces/user-performed-action-params.interface';

import { FirebaseService } from '../common';

@Injectable()
export class AppService {
  private readonly telegramBotKey: string;
  private readonly messageGeneratorMap: Map<
    NotificationTypes,
    IMessageGenerator
  >;
  constructor(
    private readonly logger: Logger,
    private readonly firebase: FirebaseService,
    private readonly configService: ConfigService,
  ) {
    this.logger.setContext(AppService.name);
    this.telegramBotKey = this.configService.get('telegram.bot.key');
    this.messageGeneratorMap = new Map<NotificationTypes, IMessageGenerator>([
      [
        NotificationTypes.periodAboutToFinish,
        this.getPeriodAboutToFinishMessage.bind(this),
      ],
      [
        NotificationTypes.evaluationPeriodFinished,
        this.getEvaluationPeriodFinishedMessage.bind(this),
      ],
      [
        NotificationTypes.userPerformedAction,
        this.getUserPerformedActionMessage.bind(this),
      ],
    ]);
  }

  async execute(payload: IMessagePayload): Promise<void> {
    this.logger.log({
      message: 'Starting execution of notification queue',
      metadata: {
        payload,
      },
    });

    const groupReference = await this.firebase
      .getGroupReference(payload.params.groupId)
      .get();

    const group = groupReference.data() as IGroup;

    await this.batchSendTelegramMessages(payload, group);

    this.logger.log({
      message: 'Finished executing notification queue',
    });
  }

  private async batchSendTelegramMessages(
    payload: IMessagePayload,
    group: IGroup,
  ) {
    const message = await this.getMessage(payload, group);
    const paginatedRecipients = this.paginate<string>(
      group.telegramChatIds,
      10,
    );

    for (const page of paginatedRecipients) {
      const promises = page.map((telegramChatId) => {
        return this.sendTelegramMessage(telegramChatId, message);
      });

      await Promise.all(promises);
      await this.delay(100);
    }
  }

  private async getMessage(payload: IMessagePayload, group: IGroup) {
    const { type } = payload;
    const messageGenerator = this.messageGeneratorMap.get(type);
    const message = await messageGenerator(payload, group);
    return message;
  }

  private async getEvaluationPeriodFinishedMessage(payload, group) {
    const { winner } = payload.params as IEvaluationPeriodFinishedParams;

    const userReference = await this.firebase.getUserReference(winner).get();
    const user = userReference.data() as IUser;

    return (
      `Round just finished in ${group.name}. The winner was ${user.displayName}\n\n` +
      `Congratulations, ${user.displayName}!\n\n` +
      'Everyone can already send a song for the new round.'
    );
  }

  private getPeriodAboutToFinishMessage(payload, group) {
    const { hours, stage } = payload.params as IPeriodAboutToFinishParams;
    const action = stage === Stage.evaluation ? 'voted' : 'sent your songs';

    if (Number(hours) === 0) {
      return (
        `Submission period just finished in ${group.name}.\n\n` +
        'Everyone can already start voting!'
      );
    }

    return (
      `${this.capitalize(stage)} period will finish in less than ${hours}h in ${
        group.name
      }.\n\n` + `If you haven't ${action} yet do it quickly!`
    );
  }

  private async getUserPerformedActionMessage(payload, group) {
    const { userId, stage } = payload.params as IUserPerformedActionParams;

    const userReference = await this.firebase.getUserReference(userId).get();
    const user = userReference.data() as IUser;

    const action = stage === Stage.evaluation ? 'voted' : 'submitted a song';

    return `User ${user.displayName} just ${action} in ${group.name}.`;
  }

  private async sendTelegramMessage(chatId, message) {
    const url = `https://api.telegram.org/bot${this.telegramBotKey}/sendMessage`;
    const body = {
      chat_id: chatId,
      text: message,
    };

    return axios
      .post(url, body)
      .then(() => this.logger.debug('Success sending message!'))
      .catch((e) =>
        this.logger.warn({
          message: e.message,
          metadata: { chatId, message },
        }),
      );
  }

  private paginate<T>(array: T[], pageSize: number): Array<T[]> {
    const totalPages = Math.ceil(array.length / pageSize);
    const paginatedArray = [];

    for (let i = 0; i < totalPages; i++) {
      const firstIndex = i * pageSize;
      const lastIndex = firstIndex + pageSize;
      const page = array.slice(firstIndex, lastIndex);
      paginatedArray.push(page);
    }

    return paginatedArray;
  }

  private capitalize(str: string): string {
    return str.slice(0, 1).toUpperCase().concat(str.slice(1));
  }

  private delay(milliseconds) {
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        return resolve();
      }, milliseconds);
    });
  }
}
