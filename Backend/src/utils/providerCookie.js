import {providerToken} from './generateToken.js'
export const providerCookies=(user)=>{
    const token=providerToken(user.id)
    return {
        name:"providerCookie",
        value:token,
        options:{
            httpOnly:true,
            secure:false,
            sameSite:"lax",
            maxAge:1000*60*60*24*7,
            path:"/"
        }
    }
}