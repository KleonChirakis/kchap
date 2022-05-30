import { Provider } from "apps/http/src/user/user.entity";

export default interface LoggedInUser {
    id: string,
    name: string,
    email?: string,
    provider: Provider
}