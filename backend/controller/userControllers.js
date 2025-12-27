import { generateToken } from "../config/generateToken.js";
import { User } from "../models/userModel.js"



export const registerUser=async(req,res)=>{
  const {name,email,password,pic}=req.body
  console.log("req.body",req.body)
  if(!name || !email || !password){
    res.status(400)
    throw new Error("Please enter all fields");
  }
  const userExists=await User.findOne({email});
  console.log("userExists",userExists)
  if(userExists){
    res.status(400);
    throw new Error("User Already Exists")
  }
 const user=await User.create({
    name,
    email,
    password,
    pic
 })
 if(user){
    
    res.status(200).json({
        id:user._id,
        name:user.name,
        email:user.email,
        pic:user.pic,
        token:generateToken(user._id)
    })
 }
 else{
    res.status(400);
    throw new Error("Something went wrong")
 }
}

export const authUser = async (req, res) => {
  console.log("shhs",req)
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Please provide email and password' });
  }

  try {
    const userDetails = await User.findOne({ email });

    if (userDetails && (await userDetails.matchPassword(password))) {
      res.status(200).json({
        id: userDetails._id,
        email: userDetails.email,
        token: generateToken(userDetails._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    console.error('Error authenticating user:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
export const allUsers= async(req,res)=>{
  const keyword= req.query.search
  ?
  {
    $or:[
      {name:{$regex:req.query.search, $options:"i"}},
      {email:{$regex:req.query.search, $options:"i"}},
    ]
  }
  :
  {}
  const users = await User.find(keyword).find({_id:{$ne:req.user._id}})
  res.send(users)
}
