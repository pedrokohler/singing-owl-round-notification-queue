import IGroup from './group.interface';
import IMessagePayload from './message-payload.interface';

type IMessageGenerator = (
  payload: IMessagePayload,
  group: IGroup,
) => Promise<string>;

export default IMessageGenerator;
