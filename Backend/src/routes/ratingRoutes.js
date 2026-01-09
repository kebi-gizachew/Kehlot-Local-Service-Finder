import {rateProvider,getProviderRatings,getMyRating,deleteMyRating,getAllRatings} from '../controllers/ratingController.js'
import {authenticationUser} from '../middleware/isLogged.js'
import express from 'express'
import {authAdmin} from '../middleware/isAdmin.js'
export const ratingRouter=express.Router()
ratingRouter.route('/').post(authenticationUser,rateProvider)
ratingRouter.route('/:providerId').get(getProviderRatings)
ratingRouter.route('/my-rating/:providerId').get(authenticationUser,getMyRating)
ratingRouter.route('/my-rating/:providerId').delete(authenticationUser,deleteMyRating)
ratingRouter.route('/').get(authAdmin,getAllRatings)
export default ratingRouter;


