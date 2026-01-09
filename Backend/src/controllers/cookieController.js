// controllers/cookieController.js
export const getCookieName = (req, res) => {
  // req.cookies will have all cookies sent by the browser
  // Only accessible here because it's server-side
  const cookies = req.cookies; 

  // If you know the cookie name you set
  const cookieName = cookies.cookie ? 'cookie' : cookies.providerCookie ? 'providerCookie' : null;

  if (!cookieName) {
    return res.status(404).json({ message: 'No relevant cookie found' });
  }

  // Send the cookie name to frontend (value remains HttpOnly, not exposed)
  res.json({ cookieName });
};
export const getUserCookieId=(req,res)=>{
    try{
        const id=req.user.id
        res.status(200).json({id})
    }catch(err){
        console.log(err)
        res.status(500).json({message:err.message})
    }
  }