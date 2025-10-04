import User from "../models/UserSchema.js";
import Company from "../models/Company.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export const registerControllers = async (req, res, next) => {
    try{
        console.log("Registration request received:", req.body);
        const {name, email, password, companyName, country, currency} = req.body;

        if(!name || !email || !password){
            return res.status(400).json({
                success: false,
                message: "Please enter All Fields",
            }) 
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid email address",
            });
        }

        // Validate password length
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters long",
            });
        }

        let user = await User.findOne({email});

        if(user){
            return res.status(409).json({
                success: false,
                message: "User already Exists",
            });
        }

        // Create company first (without admin initially)
        console.log("Creating company...");
        const company = await Company.create({
            name: companyName || `${name}'s Company`,
            country: country || "US",
            currency: currency || "USD"
        });
        console.log("Company created:", company._id);

        // Create user with admin role and company reference
        console.log("Creating user...");
        let newUser = await User.create({
            name, 
            email, 
            password, 
            role: "admin",
            company: company._id,
            permissions: {
                canApprove: true,
                canCreateUsers: true,
                canViewAllExpenses: true,
                canOverrideApprovals: true
            }
        });
        console.log("User created:", newUser._id);

        // Update company with admin reference
        console.log("Updating company with admin reference...");
        company.admin = newUser._id;
        await company.save();
        console.log("Company updated with admin reference");

        // Generate JWT token for new user
        const token = jwt.sign(
            { id: newUser._id, email: newUser.email },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        // Remove password from user object
        const userWithoutPassword = { ...newUser.toObject() };
        delete userWithoutPassword.password;

        return res.status(200).json({
            success: true,
            message: "User and Company Created Successfully",
            user: userWithoutPassword,
            company,
            token,
        });
    }
    catch(err){
        console.error("Registration error:", err);
        return res.status(500).json({
            success: false,
            message: err.message,
        });
    }

}
export const loginControllers = async (req, res, next) => {
    try{
        const { email, password } = req.body;

        if (!email || !password){
            return res.status(400).json({
                success: false,
                message: "Please enter All Fields",
            }); 
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid email address",
            });
        }
    
        const user = await User.findOne({ email });
    
        if (!user){
            return res.status(401).json({
                success: false,
                message: "User not found",
            }); 
        }
    
        const isMatch = await bcrypt.compare(password, user.password);
    
        if (!isMatch){
            return res.status(401).json({
                success: false,
                message: "Incorrect Email or Password",
            }); 
        }

        // Generate JWT token
        const token = jwt.sign(
            { id: user._id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        // Remove password from user object
        const userWithoutPassword = { ...user.toObject() };
        delete userWithoutPassword.password;

        return res.status(200).json({
            success: true,
            message: `Welcome back, ${user.name}`,
            user: userWithoutPassword,
            token,
        });

    }
    catch(err){
        return res.status(500).json({
            success: false,
            message: err.message,
        });
    }
}

export const setAvatarController = async (req, res, next)=> {
    try{

        const userId = req.params.id;
       
        const imageData = req.body.image;
      
        const userData = await User.findByIdAndUpdate(userId, {
            isAvatarImageSet: true,
            avatarImage: imageData,
        },
        { new: true });

        return res.status(200).json({
            isSet: userData.isAvatarImageSet,
            image: userData.avatarImage,
          });


    }catch(err){
        next(err);
    }
}

export const allUsers = async (req, res, next) => {
    try{
        const user = await User.find({_id: {$ne: req.params.id}}).select([
            "email",
            "username",
            "avatarImage",
            "_id",
        ]);

        return res.json(user);
    }
    catch(err){
        next(err);
    }
}