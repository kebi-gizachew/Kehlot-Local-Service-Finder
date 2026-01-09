import {createProvider,loginProvider,allProviders,updatePassword,getIdProvider,getProviderById,updateProvider,deleteProvider,clearCookie,rateProvider, getProvider, logoutProvider} from '../controllers/serviceController.js'
import {authProvider} from '../middleware/isProvider.js'
import {authAdmin} from '../middleware/isAdmin.js'
import express from 'express'
export const providerRouter=express.Router()
providerRouter.route('/').post(authAdmin,createProvider)
providerRouter.route('/login').post(loginProvider)
providerRouter.route('/logout').post(authProvider,logoutProvider)
providerRouter.route('/').get(allProviders)
providerRouter.route('/profile/:id').get(getProviderById)
providerRouter.route('/profile').get(authProvider,getProvider)
providerRouter.route('/update/:id').put(authAdmin,updateProvider)
providerRouter.route('/changePassword').put(authProvider,updatePassword)
providerRouter.route('/delete/:providerId').delete(authAdmin,deleteProvider)
providerRouter.route('/rate').post(authProvider,rateProvider)
providerRouter.route('/getIdProvider').get(authProvider,getIdProvider)
providerRouter.route('/clearCookie').post(authProvider,clearCookie)