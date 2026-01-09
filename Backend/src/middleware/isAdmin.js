import jwt from 'jsonwebtoken'
import {prisma} from '../config/db.js'
export const authAdmin=async(req,res,next)=>{
    try{
    const token=req.cookies.adminCookie
    if(!token){
        return res.status(401).json({message:'Unauthorized'})
    }
    const verify=jwt.verify(token,process.env.JWT_Admin)  
    const ver=await prisma.admin.findUnique({
        where:{
            id:verify.id
        }
    })
    if(!ver){
        return res.status(401).json({message:'Unauthorized'})
    }
    req.user=ver
    return next()  

}catch(err){
    console.log(err)
    res.status(500).json({message:err.message})
}

}