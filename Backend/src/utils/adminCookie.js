import {adminToken} from './generateToken.js'
export const adminCookies=(user)=>{
    const token=adminToken(user.id)
    return {
        name:"adminCookie",
        value:token,
        options:{
        httpOnly:false,
        secure:false,
        sameSite:"lax",
        maxAge:1000*60*60*24*7,
    }
}
}