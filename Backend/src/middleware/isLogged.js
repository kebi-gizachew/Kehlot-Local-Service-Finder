import jwt from 'jsonwebtoken'
import {prisma} from '../config/db.js'
export const authenticationUser=async(req,res,next)=>{
    try{
    const token=req.cookies.cookie
    if(!token){
        return res.status(401).json({message:'Unauthorized'})
    }
    const verify=jwt.verify(token,process.env.JWT_SECRET)
    if(!verify){
        return res.status(401).json({message:'Unauthorized'})
    }
    req.user=await prisma.user.findUnique({
        where:{
            id:verify.id
        }
    })
    console.log("mid")
    return next()


}catch(err){
    console.log(err)
    res.status(500).json({message:err.message})
}

}