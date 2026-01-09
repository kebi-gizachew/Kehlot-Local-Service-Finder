import express from 'express'
import {allAdmins,isAdmin,createAdmin, updateAdmin,loginAdmin,logoutAdmin,getAdminById} from '../controllers/adminController.js'
import {authAdmin} from '../middleware/isAdmin.js'
export const adminRouter=express.Router()
adminRouter.route('/').post(createAdmin)
adminRouter.route('/login').post(loginAdmin)
adminRouter.route('/profile').get(authAdmin,getAdminById)
adminRouter.route('/update').put(authAdmin,updateAdmin)
adminRouter.route('/logout').post(authAdmin,logoutAdmin)
adminRouter.route('/').get(authAdmin,allAdmins)
adminRouter.route('/isAdmin').get(authAdmin,isAdmin)