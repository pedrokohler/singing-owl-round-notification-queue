import { NotificationTypes } from 'src/enums/notification-types.enum';
import IEvaluationPeriodFinishedParams from './evaluation-period-finished-params.interface';
import IPeriodAboutToFinishParams from './period-about-to-finish-params.interface';
import IUserPerformedActionParams from './user-performed-action-params.interface';

export default interface IMessagePayload {
  type: NotificationTypes;
  params:
    | IEvaluationPeriodFinishedParams
    | IPeriodAboutToFinishParams
    | IUserPerformedActionParams;
}
