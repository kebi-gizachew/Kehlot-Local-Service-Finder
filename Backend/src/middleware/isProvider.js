import jwt from 'jsonwebtoken'
import {prisma} from '../config/db.js'
export const authProvider=async(req,res,next)=>{
    try{
        const token=req.cookies.providerCookie
        if(!token){
            return res.status(401).json({message:'Unauthorized'})
        }
        const verify=jwt.verify(token,process.env.JWT_PROVIDER)
        const ver=await prisma.serviceProvider.findUnique({
            where:{
                id:verify.id
            }
        })
        req.user=ver
        return next()
    }catch(err){
        console.log(err)
        res.status(500).json({message:err.message})
    }

    }