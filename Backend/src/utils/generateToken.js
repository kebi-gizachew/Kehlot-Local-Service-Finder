import jwt from 'jsonwebtoken'
export const generateToken=(id)=>{ 
    return jwt.sign({id},process.env.JWT_SECRET,{
        expiresIn:'7d'
    })     
}
export const adminToken=(id)=>{
    return jwt.sign({id},process.env.JWT_Admin,{
        expiresIn:'7d'
    })

}
export const providerToken=(id)=>{
    const token=jwt.sign({id},process.env.JWT_PROVIDER,{
        expiresIn:'7d'
    })
    return token

}