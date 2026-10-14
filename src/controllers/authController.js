import { prisma } from "../config/db.js";
import bcrypt from "bcryptjs";
import { generateToken } from "../utils/generateToken.js";

const registerUser = async (req, res) => {
    const { name, email, password } = req.body;

    //check if user already exists.
    const userExists = await prisma.user.findUnique({
        where: { email: email }
    })
    if (userExists) {
        return res.status(400).json({
            error: "User already exists with this email."
        })
    }

    //hash the password that the user enter .
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt)

    //create user 
    const user = await prisma.user.create({
        data: {
            name,
            email,
            password: hashedPassword
        }
    })
    //generate token for user 
    const token = generateToken(user.id, res);

    return res.status(201).json({
        status: "success",
        data: {
            user: {
                id: user.id,
                name: name,
                email: email
            },
            token,
        }
    })
}

const login = async (req, res) => {
    const { email, password } = req.body;
    //check if user  Email  exists in the DB/table.

    const user = await prisma.user.findUnique({
        where: { email: email }
    })
    if (!user) {
        return res.status(401).json({
            error: "invalid Email or Password."
        })
    }

    //verify the password.

    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
        return res.status(401).json({
            error: "invalid Email or Password."
        })
    }
    //generate the JWT token 
    const token = generateToken(user.id, res);
    return res.status(201).json({
        status: "success",
        data: {
            user: {
                id: user.id,
                email: email
            },
            token,
        }
    })

}

const logout = async (req, res) => {
    res.cookie("jwt", "", {
        httpOnly: true,
        expires: new Date(0)
    })
    res.status(200).json({
        status: "success",
        message: "Logged out successfully."
    })

}


export { registerUser, login, logout };

