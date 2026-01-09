import {generateToken} from './generateToken.js'
export const generateCookies=(user)=>{
    const token=generateToken(user.id)
    return {
        name:"cookie",
        value:token,
        options:{
        httpOnly:true,
        secure:false,
        sameSite:"lax",
        maxAge:1000*60*60*24*7,
    }
}
}