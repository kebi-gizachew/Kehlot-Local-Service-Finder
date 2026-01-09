import {prisma} from '../config/db.js'
import { adminCookies } from '../utils/adminCookie.js';
import bcrypt from 'bcrypt'
export const createAdmin=async(req,res)=>{
    try{
    const {name,email,password}=req.body;
    if(!name || !email || !password){
        return res.status(400).json({message:'All fields are required'})
    }
    const existingAdmin=await prisma.admin.findUnique({
        where:{
            email
        }
    })
    if(existingAdmin){
        return res.status(400).json({message:'Admin already exists'})
    }
    const hashedPassword=await bcrypt.hash(password,10)
    const user= await prisma.admin.create({
        data:{
            name,
            email,
            password:hashedPassword
        
        }
    })
    const cook=adminCookies(user)
    res.cookie(cook.name,cook.value,cook.options)
    res.status(201).json(user)
}catch(err){
    console.error(err)
    res.status(500).json({message:err.message})
}
}
export const allAdmins=async(req,res)=>{
    try{
        const admins=await prisma.admin.findMany()
        res.status(200).json(admins)
    }catch(err){
        res.status(500).json({message:err.message})
    }
}
export const isAdmin=async(req,res)=>{
    try{
        const id=req.user.id
        const admin=await prisma.admin.findUnique({
            where:{
                id
            }
        })
        if(!admin){
            res.status(404).json({isAdmin:false,message:'Admin not found'})
        }
        res.status(200).json({isAdmin:true})
    }catch(err){
        console.error(err)
        res.status(500).json({isAdmin:false,message:"Internal server error."})
    }
}
export const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(email, password);
    const user = await prisma.admin.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const cook = adminCookies(user);

    return res
      .cookie(cook.name, cook.value, cook.options)
      .status(200)
      .json({
        id: user.id,
        email: user.email,
        role: user.role
      });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
};

export const getAdminById=async(req,res)=>{
    try{
        const id=req.user.id
        const admin=await prisma.admin.findUnique({
            where:{
                id
            }
        })
        if(!admin){
            res.status(404).json({message:'Admin not found'})
        }
        res.status(200).json(admin)
    }catch(err){
        console.error(err)
        res.status(500).json({message:"Internal server error."})
    }
}
export const logoutAdmin=async(req,res)=>{
    try{
        res.clearCookie('adminCookie')
        res.status(200).json({message:'Logged out successfully'})

    }catch(err){
        console.error(err)
        res.status(500).json({message:"Internal server error."})
    }
}
export const updateAdmin=async(req,res)=>{
    try{
        const {name,email,password}=req.body
        const id=req.user.id;
        let hashedPassword;
        const admin=await prisma.admin.findUnique({
            where:{
                id
            }
        
        })
        if(!admin){
            res.status(400).json({message:'Admin not found'})
        }
        if (password){
            hashedPassword=await bcrypt.hash(password,10)
        }
        const updatedAdmin=await prisma.admin.update({
            where:{
                id
            },
            data:{
                name,
                email,
                password:hashedPassword
            }
        })
        res.status(200).json(updatedAdmin)
    
    }catch(err){
        console.error(err)
        res.status(500).json({message:"Internal server error."})
    }
}