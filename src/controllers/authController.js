import { prisma } from "../config/db.js";
import bcrypt from "bcryptjs";
import { generateToken } from "../utils/generateToken.js";

//cost factor: each +1 doubles the hashing time. 12 is about 250ms, slow on purpose for guessing.
const SALT_ROUNDS = 12;
//compared against when the email doesn't exist, so a wrong email takes as long as a
//wrong password and response times don't reveal which emails are registered.
const DUMMY_HASH = bcrypt.hashSync("dummy-password-for-timing", SALT_ROUNDS);

const registerUser = async (req, res) => {
    const { name, email, password } = req.body;

    //check if user already exists.
    //(two requests at the same moment can both pass this check, the unique
    //index on email then makes one fail with P2002, which the error handler turns into 409)
    const userExists = await prisma.user.findUnique({
        where: { email: email }
    })
    if (userExists) {
        return res.status(409).json({
            error: "User already exists with this email."
        })
    }

    //hash the password that the user enter. bcrypt generates and stores the salt inside the hash.
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS)

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
                name: user.name,
                email: user.email
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

    //verify the password. always run bcrypt, even when there is no user (see DUMMY_HASH).
    const isPasswordValid = await bcrypt.compare(password, user?.password ?? DUMMY_HASH)

    //same message for both cases, so attackers can't find out which emails exist.
    if (!user || !isPasswordValid) {
        return res.status(401).json({
            error: "invalid Email or Password."
        })
    }
    //generate the JWT token
    const token = generateToken(user.id, res);
    return res.status(200).json({
        status: "success",
        data: {
            user: {
                id: user.id,
                name: user.name,
                email: user.email
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

//returns the logged in user (set by authMiddleware, without the password).
const getMe = async (req, res) => {
    res.status(200).json({
        status: "success",
        data: {
            user: req.user
        }
    })
}


export { registerUser, login, logout, getMe };
