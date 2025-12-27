import mongoose from "mongoose";
import bcrypt from 'bcryptjs'
const userSchema=mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true,
        unique:true
    },
    password:{
        type:String,
        required:true
    },
    pic:{
      type:String,
       required:true,
        default:"https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg"
    }
},{
    timestamps:true
})

userSchema.method('matchPassword',async function(enterpassword){
    console.log("enterpassword",enterpassword,this.password)
return await bcrypt.compare(enterpassword,this.password)
}
)

// userSchema.pre("save",async function(next){
//     if(!this.isModified){
//         next();
//     }
//     const salt=await bcrypt.genSalt(10);
//     this.password=await bcrypt.hash(this.password,salt)
// })
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});


export const User=mongoose.model('User',userSchema)