import { Stage } from 'src/enums/stage.enum';

export default interface IUserPerformedActionParams {
  stage: Stage;
  userId: string;
  groupId: string;
}
