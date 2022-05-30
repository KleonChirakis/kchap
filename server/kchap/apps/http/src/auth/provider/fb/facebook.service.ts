import { HttpException, HttpStatus, Injectable, Logger, OnModuleInit, ServiceUnavailableException } from "@nestjs/common";
import { FacebookUserRepository } from "./facebook.repository";
import * as fetch from 'node-fetch';
import { UserRepository } from "../../../user/user.repository";
import { Provider, User } from "../../../user/user.entity";
import { FBUser } from "./facebook.user.entity";
import LoggedInUser from "../../common/logged.in.user";
import * as config from '../../../../../../config.json'
import { URL } from 'url';

/**
 * Facebook id is the same even if the user revokes app's access and then relogins
 */
@Injectable()
export class FacebookService implements OnModuleInit {
    private readonly logger = new Logger(FacebookService.name);
    appAccessToken: string;
    generatingGenAccToken: boolean;
    lastFbTokenAcquisitionTimestamp: number = 0;

    constructor(private userRepository: UserRepository, private FBUserRepository: FacebookUserRepository) { }

    async onModuleInit(): Promise<void> {
        try { 
            const appAccessToken = await this.getAppAccessToken();
            if (appAccessToken == null || appAccessToken === "") 
                this.logger.error('Facebook Service initialization failed');
            else
                this.logger.log('Facebook Service initialized, token acquired');
        } catch (e) {
            this.logger.error('Initial attempt to acquire facebook app token failed');
        }
    }
      
    async validateFBUser(fbId: string, accessToken: string): Promise<LoggedInUser> {
        // Check if user has used this login provider (facebook) before
        let fbUser = await this.FBUserRepository.findById(fbId);        // If facebook id exists, then user has logged in using fb again
        let user: User = (fbUser == null) ? null : fbUser.user;
        console.log('fb');

        if (!await this.validateFBToken(fbId, accessToken))
            throw new HttpException('Facebook user token could not be validated', HttpStatus.BAD_REQUEST);  // Check if provider info are valid

        const fbUserRes = await this.getFBUserInfo(fbId, accessToken);  // Get facebook account info for user creation or info

        // If fbId exists, then login
        // If fbId didn't exist, then a new user is created with main provider this fb account. Login to iniate session
        // In both cases we login the user
        if (user == null) {                                             // First login
            user = new User();
            user.mainProvider = Provider.FACEBOOK;
            fbUser = new FBUser(fbUserRes.id, user);
            console.log('creating new fb user'); 
        }
           
        user.name = fbUserRes.name;                                     // Refresh name
        
        // Saving User and FBUser should be done as transaction, typeorm takes care of that because of cascade
        await this.FBUserRepository.save(fbUser);
         
        const loggedInUser: LoggedInUser = { id: user.id, name: user.name, provider: Provider.FACEBOOK }
        return loggedInUser;
    }

    async getFBUserInfo(fbId: string, accessToken: string): 
        Promise<{
            id: string,
            name: string, 
            email?: string          // Email can be null (use phone to login) or may have their email permission disabled. Because of the first point, fb users can login without an email
        }> 
    {
        let url = new URL('https://graph.facebook.com/oauth/access_token');
        url.pathname = fbId;
        if (config.production.apis.facebook.permissions)                                   // True if string not empty
            url.searchParams.set('fields', config.production.apis.facebook.permissions);
        url.searchParams.set('access_token', accessToken);
        const response = await fetch(url);
        const json = await response.json();
        
        if (response.status === 200) return json;
                  
        this.handleFacebookErrorCodes(json.error);
    }


    /**
     * Client error include access token, permissions... App errors include app token, 
     * api call limit... Focus on user errors. Indicate other errors as server error,
     * bu always prompt users to relogin, which may result in solving their issue faster.
     */
    static clientErrCodes = [102, 3, 10, 190];      // Ranges are excluded for performance
    handleFacebookErrorCodes(error: any) {
        const errCode = error.code;
        this.logger.warn(`Facebook error handler triggered with code: ${errCode}`);
        console.error(error);
        if (FacebookService.clientErrCodes.includes(errCode) ||
                (errCode >= 200 && errCode <=299)) {
            throw new HttpException('Please login again', HttpStatus.BAD_REQUEST);
        } else {
            throw new HttpException('This could be on our end. Please try again shortly', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /** 
     * An App Access Token is signed using app secret and will not expire.
     * It will be invalidated if application secret is reset.
     */
    async generateAppAccessToken(): Promise<{ access_token: string, token_type: string }> {
        // Validate app credentials
        const url = new URL('https://graph.facebook.com/oauth/access_token');
        url.searchParams.set('client_id', config.production.apis.facebook.appId);
        url.searchParams.set('client_secret', config.production.apis.facebook.appSecret); 
        url.searchParams.set('grant_type', 'client_credentials');
        return await (await fetch(url)).json()
    }

    async getAppAccessToken(invaliateCurrentToken?: boolean): Promise<string> {
        if (this.appAccessToken == null || invaliateCurrentToken) {
            if (new Date().getTime() - this.lastFbTokenAcquisitionTimestamp < 30000) return;        // 30 seconds
            if (this.generatingGenAccToken) return;                                                 // Prevent possible multiple calls to the same function
            this.generatingGenAccToken = true;
            this.appAccessToken = (await this.generateAppAccessToken()).access_token;
            this.lastFbTokenAcquisitionTimestamp = new Date().getTime();
            this.generatingGenAccToken = false;
        }
        return this.appAccessToken;
    }

   /**
    * Mutiple users may try to access this resource with a failed app token.
    * Their requests will fail, because the getAppAccessToken() will be locked
    * and its response will be null. When the user retries logging in, the token
    * should have been refreshed and the login should work as supposed to.
    */
    async validateFBToken(fbId: string, accessToken: string): Promise<boolean> {
        const appAccessToken = await this.getAppAccessToken();
        if (appAccessToken == null || appAccessToken === "") 
            throw new ServiceUnavailableException('Please try to login with Facebook later'); 

        // Validate user credentials
        const url = new URL('https://graph.facebook.com/debug_token');
        url.searchParams.set('input_token', accessToken);
        url.searchParams.set('access_token', appAccessToken);
        const response = await fetch(url);
        const json = await response.json();

        if (json.error && !this.generatingGenAccToken) {           // app creds invalid
            this.logger.log('Error validating user token, reacquiring application token');
            const res = await this.getAppAccessToken(true);
            if (res == null) return false;
            return await this.validateFBToken(fbId, accessToken);
        }

        return response.ok;
    }
}