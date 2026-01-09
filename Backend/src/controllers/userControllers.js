import {prisma} from '../config/db.js'
import bcrypt from  'bcrypt'
import {generateCookies} from '../utils/generateCookie.js'
export const createUser=async(req,res)=>{
    const {name,email,password}=await req.body
    console.log(name,email,password)
    if(!name || !email || !password){
        return res.status(400).json({ok:false,message:'All fields are required'})
    }
    const existingUser=await prisma.user.findUnique({
        where:{
            email
        }
    })
    if(existingUser){
        return res.status(400).json({ok:false,message:'User already exists'})
    }
    const hashedPassword=await bcrypt.hash(password,10)
    try{
        const user=await prisma.user.create({
            data:{
                name,
                email,
                password:hashedPassword
            }
        })
        console.log(user)
        const cook=generateCookies(user)
        res.cookie(cook.name,cook.value,cook.options)
        res.status(201).json({ok:true,inf:user})
    }catch(err){
        console.log(err)
        res.status(500).json({ok:false,message:"Network Error Try Again Later."})
    
    }

}
export const getUserById=async(req,res)=>{
    try{
    const user=await prisma.user.findUnique({
        where:{
            id:req.user.id
        }
    })
    if(!user){
        return res.status(404).json({message:'User not found'})
    }
    res.status(200).json(user)

}catch(err){
    console.log(err)
    res.status(500).json({message:err.message})

}}
export const getUserByIdParam=async(req,res)=>{
    try{
    const {id}=req.params
    const user=await prisma.user.findUnique({
        where:{
            id
        }
    })
    if(!user){
        return res.status(404).json({message:'User not found'})
    }
    res.status(200).json(user)

}catch(err){
    console.log(err)
    res.status(500).json({message:err.message})

}}
export const clearCookies=async(req,res)=>{
    try{
    res.clearCookie('cookie')
    res.status(200).json({message:'Cookies cleared'})
}catch(err){
    console.log(err)
    res.status(500).json({message:err.message})

}
}
export const loginUser=async(req,res)=>{
    try{
        const {email,password}=req.body
         console.log('Login attempt for email:', email);
        const user=await prisma.user.findUnique({
            where:{
                email
            }
        })
        if(!user){
            console.log("invalid")
            return res.status(400).json({message:'Invalid credentials please try again or register.'})
        }
        const isMatch=await bcrypt.compare(password,user.password)  
        if(!isMatch){
            return res.status(400).json({message:'Invalid credentials'})
        }
        console.log(user)
        const cook=generateCookies(user)
        res.cookie(cook.name,cook.value,cook.options)
        res.status(200).json(user)

    }catch(err){
        console.log(err)
        res.status(500).json({message:err.message})
    
    }
}
export const updateUser=async(req,res)=>{
    try{
        const {name,email,password}=req.body
        const user=await prisma.user.update({
            where:{
                id:req.user.id
            },
            data:{
                name,
                email,
                password
            }
        })
        res.status(200).json(user)
    }catch(err){
        console.log(err)
        res.status(500).json({message:err.message})
    
    }
} 
export const logoutUser=async(req,res)=>{
    try{
        const id=req.user.id
        const user=await prisma.user.delete({
            where:{
                id
            }
        })
        
        res.clearCookie('cookie')
        res.status(200).json({message:'Logged out successfully'})
        }catch(err){
        console.log(err)
        res.status(500).json({message:err.message})
    
    }
}
export const totalUsers=async(req,res)=>{
    try{
        const total=await prisma.user.count()
        console.log(total)
        res.status(200).json(total)
    }catch(err){
        res.status(500).json({message:err.message})
    }
}
export const getUsers=async(req,res)=>{
    try{
        const users=await prisma.user.findMany()
        res.status(200).json(users)
    }catch(err){
        console.log(err)
        res.status(500).json({message:err.message})
    
    }
}
export const getIdUser=async(req,res)=>{
    try{
        res.status(200).json({id:req.user.id})
    }catch(err){
        console.log(err)
        res.status(500).json({message:err.message})
    
    }
}