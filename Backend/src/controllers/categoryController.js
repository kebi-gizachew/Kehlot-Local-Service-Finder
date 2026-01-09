import {prisma} from '../config/db.js'
import bcrypt from 'bcrypt'

export const createCategory=async(req, res) => {
  const {name}=req.body;

  if (!name){
    return res.status(400).json({message: "Category name is required" });
  }

  try {
    const existing=await prisma.category.findUnique({
      where: { name }
    });

    if (existing){
      return res.status(400).json({ message: "Category already exists" });
    }

    const category=await prisma.category.create({
      data: {name }
    });

    res.status(201).json(category);
  } catch (error) {
    console.error(error);
    res.status(500).json({message: "Failed to create category" });
  }
}
export const getAllCategories = async (req, res) => {
  try {
    const categories=await prisma.category.findMany({
      orderBy: {name:"asc" }
    });

    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch categories" });
  }
}

export const getCategoryWithProviders = async (req, res) => {
  const { id }= req.params;

  try {
    const category=await prisma.category.findUnique({
      where: {id},
      include: {
        providers:{
          where: {isVerified: true },
          orderBy: { averageRating: "desc" },
          select: {
            id: true,
            name: true,
            location: true,
            profileImage: true,
            averageRating: true,
            totalRatings: true
          }
        }
      }
    });

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.json(category);
  } catch (error){
    res.status(500).json({ message: "Failed to fetch category" });
  }
}
export const updateCategory = async (req, res) => {
  const {id} = req.params;
  const {name} = req.body;

  if (!name) {
    return res.status(400).json({ message: "Category name is required" });
  }

  try {
    const category=await prisma.category.update({
      where: {id },
      data: {name }
    });

    res.json(category);
  } catch (error) {
    res.status(500).json({ message: "Failed to update category" });
  }
}
export const deleteCategory = async (req, res) => {
  const {id } = req.params;

  try {
    const providersCount = await prisma.serviceProvider.count({
      where: {categoryId: id }
    });

    if (providersCount > 0) {
      return res.status(400).json({
        message: "Cannot delete category with assigned providers"
      });
    }

    await prisma.category.delete({
      where: { id }
    });

    res.json({message: "Category deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete category" });
  }
}
export const categoryStats=async (req, res) => {
  try {
    const stats=await prisma.category.findMany({
      select:{
        name:true,
        _count:{
          select: {
            providers: true
          }
        }
      }
    });

    res.json(stats);
  } catch (error){
    res.status(500).json({ message: "Failed to fetch category stats" });
  }

}
export const getCategoryById=async(req,res)=>{
  try{
  const {id}=req.params
  const category=await prisma.category.findUnique({
    where:{
      id
    }
  })
  if(!category){
    return res.status(404).json({message:'Category not found'})
  }
  res.status(200).json({
    id:category.id,
  name:category.name,
createdAt:category.createdAt
  })
}catch(err){
  console.log(err)
  res.status(500).json({message:err.message})
}
}


