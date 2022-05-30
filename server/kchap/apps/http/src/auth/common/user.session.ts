import { Provider } from "../../user/user.entity";

export default interface UserSession {
    expires: Date,
    provider: Provider,
    device: string,
    loginDate: Date,
    deviceId: string
}