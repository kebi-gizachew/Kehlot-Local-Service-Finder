import {createCategory,getAllCategories,getCategoryWithProviders,updateCategory,deleteCategory,categoryStats,getCategoryById} from '../controllers/categoryController.js'
import {authAdmin} from '../middleware/isAdmin.js'
import express from 'express'
export const categoryRouter=express.Router()
categoryRouter.route('/').post(authAdmin,createCategory)
categoryRouter.route('/').get(getAllCategories)
categoryRouter.route('/:id').get(getCategoryWithProviders)
categoryRouter.route('/:id').put(authAdmin,updateCategory)
categoryRouter.route('/:id').delete(authAdmin,deleteCategory)
categoryRouter.route('/stats').get(authAdmin,categoryStats)
categoryRouter.route('/:id').get(getCategoryById)

