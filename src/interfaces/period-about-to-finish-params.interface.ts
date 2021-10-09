import { Stage } from 'src/enums/stage.enum';

export default interface IPeriodAboutToFinishParams {
  hours: number;
  stage: Stage;
  groupId: string;
}
