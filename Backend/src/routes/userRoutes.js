import express from 'express'
import {createUser,getUserById,loginUser,updateUser,getUserByIdParam,clearCookies,getIdUser,logoutUser,getUsers,totalUsers} from '../controllers/userControllers.js'
import {authenticationUser} from '../middleware/isLogged.js'
import {authAdmin} from '../middleware/isAdmin.js'
export const userRouter=express.Router()
userRouter.route('/').post(createUser)
userRouter.route('/').get(authenticationUser,getUsers)
userRouter.route('/profile').get(authenticationUser,getUserById)
userRouter.route('/profile/:id').get(getUserByIdParam)
userRouter.route('/login').post(loginUser)
userRouter.route('/update').put(authenticationUser,updateUser)
userRouter.route('/logout').delete(authenticationUser,logoutUser)
userRouter.route('/totalUser').get(authAdmin,totalUsers)
userRouter.route('/getIdUser').get(authenticationUser,getIdUser)
userRouter.route('/clearCookies').post(authenticationUser,clearCookies)
