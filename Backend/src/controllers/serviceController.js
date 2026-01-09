import {prisma} from '../config/db.js'
import bcrypt from 'bcrypt'
import {providerCookies} from '../utils/providerCookie.js'
    
export const createProvider=async(req,res)=>{
    console.log("at the backend")
    console.log(req.body)
    const {name,email,password,phoneNumber,location,bio,profileImage,verificationPic,faydaIdImage,isVerified,categoryId}=req.body
    if(!name || !email || !password || !phoneNumber || !location || !categoryId ||!verificationPic){
        return res.status(400).json({message:'All fields are required'})
    
    }
    console.log("passed the if")
    try{
    const existingProvider=await prisma.serviceProvider.findUnique({
        where:{
            email
        }
    })
    if(existingProvider){
        console.log("provider exists")
        return res.status(400).json({message:'Provider already exists'})
    }
     const category = await prisma.category.findUnique({
            where: { 
                id: categoryId 
            }
        })
        if (!category) {
            console.log("invalid category")
  return res.status(400).json({ message: "Invalid category" });
}
    const hashedPassword=await bcrypt.hash(password,10) 
    console.log("hashed password"+hashedPassword)
        const provider=await prisma.serviceProvider.create({
            data:{
                name,
                email,
                password:hashedPassword,
                phoneNumber,
                location,
                bio,
                profileImage,
                faydaIdImage,
                verificationPic,
                averageRating:0,
                totalRatings:0,
                isVerified,
                categoryId
            }
            
        })
        console.log("Provider created:", provider);
        const cook=providerCookies(provider)
        res.cookie(cook.name,cook.value,cook.options)
        res.status(201).json(provider)


}catch(err){
    console.log(err)
    res.status(500).json({message:err.message})
}}
export const loginProvider=async(req,res)=>{
    try{
    const {email,password}=req.body
    const user=await prisma.serviceProvider.findUnique({
        where:{
            email
        }
    })
    if(!user){
        return res.status(400).json({message:'Invalid credentials'})
    }
    console.log("got it")
    const isMatch=await bcrypt.compare(password,user.password)
    if (!isMatch){
        console.log("invalid password")
        return res.status(400).json({message:'Invalid credentials'})
    
    }
    console.log("password matched")
    const cook=providerCookies(user)
   
    res.cookie(cook.name,cook.value,cook.options)
    console.log(user)
    res.status(200).json(user)

}catch(err){
    console.log("error")
    console.log(err)
    res.status(500).json({message:err.message})
}
}
export const allProviders=async(req,res)=>{
    try{
        const providers=await prisma.serviceProvider.findMany()
        res.status(200).json(providers)
}catch(err){
    console.log(err)
    res.status(500).json({message:err.message})
}

}
// In your providerRoutes.js file


// And the controller function:
export const getProviderById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const provider = await prisma.serviceProvider.findUnique({
            where: { id: id },
            select: {
                id: true,
                name: true,
                email: true,
                phoneNumber: true,
                location: true,
                bio: true,
                profileImage: true,
                faydaIdImage: true,
                isVerified: true,
                averageRating: true,
                totalRatings: true,
                categoryId: true,
                createdAt: true,
                updatedAt: true
            }
        });
        
        if (!provider) {
            return res.status(404).json({ message: 'Provider not found' });
        }
        
        res.status(200).json(provider);
    } catch (error) {
        console.error('Error fetching provider:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
export const getProvider = async (req, res) => {
  try {
    const id = req.user.id; // ✅ fixed

    const provider = await prisma.serviceProvider.findUnique({
      where: { id }
    });

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Provider not found"
      });
    }

    res.status(200).json({
      success: true,
      data: provider
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

export const updateProvider=async(req,res)=>{
    try{
        const {id}=req.params
        const {name,email,password,phoneNumber,location,bio,categoryId,profileImage,faydaIdImage,verificationPic,isVerified}=req.body
        const user=await prisma.serviceProvider.findUnique({
            where:{
                id
            }
        })
        if (!user){
            res.status(404).json({message:'Provider not found'})
        }
        if (password) {
        const hashedPassword= password ? await bcrypt.hash(password,10) : user.password
        const userUpdated=await prisma.serviceProvider.update({
            where:{id},
            data:{
                name,
                email,
                password:hashedPassword,
                phoneNumber,
                location,
                bio,
                profileImage,
                faydaIdImage,
                verificationPic,
                isVerified,
                categoryId
            }
        })
    }else{
        const userUpdated=await prisma.serviceProvider.update({
            where:{id},
            data:{
                name,
                email,
                phoneNumber,
                location,
                bio,
                profileImage,
                faydaIdImage,
                verificationPic,
                isVerified,
                categoryId
            }
        })
        res.status(200).json(userUpdated)
    }
}catch(err){
        console.log(err)
        res.status(500).json({message:err.message})
    
    
        }

    }
export const updatePassword=async(req,res)=>{
    try{
        const id=req.user.id
        const password=req.body.password
        const hashedPassword=await bcrypt.hash(password,10)
        const user=await prisma.serviceProvider.update({
            where:{
                id
            },
            data:{
                password:hashedPassword
            }
        })
        res.status(200).json(user)
    }catch(err){
        console.log(err)
        res.status(500).json({message:err.message})

        
    }
}
export const logoutProvider = async (req, res) => {
    try {
        console.log("Cookies in request:", req.cookies);
        console.log("Specific providerCookie value:", req.cookies?.providerCookie);
        
        // Clear the providerCookie - DON'T specify domain since it wasn't set with one
        res.clearCookie('providerCookie', {
            path: '/',
            httpOnly: true,
            secure: false,
            sameSite: 'lax'
            // NO domain property!
        });
        
        console.log("Provider cookie cleared");
        
        res.status(200).json({ 
            message: 'Logged out successfully',
            cookiesCleared: true 
        });
        
    } catch (err) {
        console.error("Logout error:", err);
        res.status(500).json({ 
            message: 'Logout failed', 
            error: err.message 
        });
    }
}
export const getIdProvider=async(req,res)=>{
    try{
        res.status(200).json({id:req.user.id})
    }catch(err){
        console.log(err)
        res.status(500).json({message:err.message})
    
    }
}

export const deleteProvider = async (req, res) => {
  const { providerId } = req.params;

  try {
    const provider = await prisma.serviceProvider.findUnique({
      where: { id: providerId }
    });

    if (!provider) {
      return res.status(404).json({ error: "Provider not found" });
    }

    const conversations = await prisma.conversation.findMany({
      where: { providerId },
      select: { id: true }
    });

    const conversationIds = conversations.map(c => c.id);

    if (conversationIds.length > 0) {
      await prisma.message.deleteMany({
        where: {
          conversationId: {
            in: conversationIds
          }
        }
      });

      await prisma.conversation.deleteMany({
        where: {
          id: {
            in: conversationIds
          }
        }
      });
    }
    await prisma.rating.deleteMany({
      where: { providerId }
    });

    await prisma.serviceProvider.delete({
      where: { id: providerId }
    });

    return res.status(200).json({
      message: "Provider and all related data deleted successfully"
    });

  } catch (error) {
    console.error("Delete provider error:", error);
    return res.status(500).json({
      error: "Failed to delete provider safely"
    });
  }
};

export async function rateProvider(req, res) {
  const { providerId, rating } = req.body;
  const userId = req.user.id;

  await prisma.rating.upsert({
    where: {
      userId_providerId: {
        userId,
        providerId
      }
    },
    update: { rating },
    create: { rating, userId, providerId }
  });

  const stats = await prisma.rating.aggregate({
    where: { providerId },
    _avg: { rating: true },
    _count: { rating: true }
  });

  await prisma.serviceProvider.update({
    where: { id: providerId },
    data: {
      averageRating: stats._avg.rating || 0,
      totalRatings: stats._count.rating
    }
  });

  res.json({ success: true });
}
export const clearCookie=async(req,res)=>{
    try{
        res.clearCookie('providerCookie',{
            path:'/',
            httpOnly:true,
            secure:false,
            sameSite:'lax'
        })
        res.status(200).json({message:'Cookie cleared successfully'})
    }catch(err){
        console.log(err)
        res.status(500).json({message:err.message})
    }
}