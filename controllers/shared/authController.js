import { User } from "../../models/userModel.js";
import argon2 from "argon2";

// Login User
export const login = async (req, res) => {
    try {
        const user = await User.findOne({
            where: {
                email: req.body.email
            }
        });

        if (!user) {
            return res.status(404).json({ msg: "User not found" });
        }

        // Validate request
        if (!req.body.password || !user.password) {
            return res.status(400).json({ msg: "Invalid credentials:" + user.password });
        }

        try {
            // Verify hashed password
            const match = await argon2.verify(user.password, req.body.password);

            if (!match) {
                return res.status(400).json({ msg: "Wrong password" });
            }

            req.session.user_id = user.user_id;
            console.log(req.session.user_id);

            const { password, ...userData } = user.dataValues;

            res.status(200).json({
                msg: "Login successful",
                user: userData
            });

        } catch (hashError) {
            console.error('Password verification error:', hashError);
            return res.status(400).json({ msg: "Invalid password format" });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ msg: "Internal server error" });
    }
};

// Registrasi User
export const registrasi = async (req, res) => {
    const { name, email, phone, password } = req.body;

    try {
        // Check existing email
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ msg: "Email already in use" });
        }

        // Create new user with provided values
        await User.create({
            fullname: name, // Map name from frontend to fullname in database
            email,
            password, // Password is automatically hashed in the User model hooks
            phone_number: phone, // Map phone from frontend to phone_number in database
            role: 'customer',
            status: 'active',
            verified: true,
            address: '-',
            province_id: 0,
            city_id: 0,
            district_id: 0,
            postal_code: '-'
        });

        res.status(201).json({ msg: "Registration successful" });
    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ msg: "Server error occurred during registration" });
    }
};

// Get User Data
export const Me = async (req, res) => {
    try {
        if (!req.session.user_id) {
            return res.status(401).json({ msg: "Mohon login ke akun anda" });
        }
        const user = await User.findOne({
            attributes: [
                'user_id',
                'fullname',
                'email',
                'role',
                'profile_picture',
                'gender',
                'status',
                'verified',
                'created_at',
                'updated_at'
            ],
            where: {
                user_id: req.session.user_id
            }
        });

        if (!user) {
            return res.status(404).json({ msg: "User tidak ditemukan" });
        }

        res.status(200).json(user);
    } catch (error) {
        console.error("Get user error:", error);
        res.status(500).json({ msg: "Terjadi kesalahan pada server" });
    }
};

// Logout User
export const logOut = (req, res) => {
    req.session.destroy((err) => {
        if (err) return res.status(400).json({ msg: "Tidak dapat Logout" });

        // Return successful logout message
        res.status(200).json({ msg: "Anda telah Logout" });
    });
};
