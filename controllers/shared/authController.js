import argon2 from "argon2";

// Login User
export const login = async (req, res) => {
    console.log("Login attempt for email:", req.body.email);

    try {
        // Dynamic import of User model
        const { User } = await import("../../models/userModel.js");
        
        if (!req.body.email) {
            console.error("Login error: Email is missing in request");
            return res.status(400).json({ msg: "Email required" });
        }

        const user = await User.findOne({
            where: {
                email: req.body.email
            }
        });

        console.log("User found:", user ? "Yes" : "No");

        if (!user) {
            console.error(`User not found for email: ${req.body.email}`);
            return res.status(404).json({ msg: "User not found" });
        }

        // Debug user object structure
        console.log("User object structure:", Object.keys(user));
        console.log("Has dataValues:", !!user.dataValues);
        console.log("User ID:", user.user_id);

        // Validate request
        if (!req.body.password) {
            console.error("Login error: Password is missing in request");
            return res.status(400).json({ msg: "Password required" });
        }

        if (!user.password) {
            console.error(`Password missing for user ${user.user_id}`);
            return res.status(400).json({ msg: "Invalid user account" });
        }

        // Debug password format
        console.log("Password hash format check:", {
            length: user.password.length,
            startsWithArgon2: user.password.startsWith('$argon2'),
            prefix: user.password.substring(0, 8)
        });

        try {
            // Check if password is in proper PHC format with more flexible check
            if (!user.password.startsWith('$argon2')) {
                console.error('Password hash format issue - Hash:', user.password.substring(0, 10) + '...');
                return res.status(400).json({ msg: "Invalid password format in database" });
            }

            // Verify hashed password
            console.log("Attempting password verification...");
            const match = await argon2.verify(user.password, req.body.password);
            console.log("Password verification result:", match ? "Match" : "No match");

            if (!match) {
                console.error(`Wrong password for user ${user.user_id}`);
                return res.status(400).json({ msg: "Wrong password" });
            }

            // Session debug
            console.log("Session before:", req.session ? "Exists" : "Missing");
            req.session.user_id = user.user_id;
            console.log("Session after:", req.session ? `Set with ID ${req.session.user_id}` : "Missing");

            // Make safe userData extraction more resilient
            let userData;
            if (user.dataValues) {
                const { password, ...extractedData } = user.dataValues;
                userData = extractedData;
            } else {
                // Handle case where dataValues doesn't exist
                const userObj = user.toJSON ? user.toJSON() : { ...user };
                delete userObj.password;
                userData = userObj;
            }

            // Debug final response
            console.log("Login successful, sending response with user data");

            res.status(200).json({
                msg: "Login successful",
                user: userData
            });

        } catch (hashError) {
            console.error('Password verification error:', hashError.name, hashError.message);
            console.error('Error stack:', hashError.stack);
            return res.status(400).json({ msg: "Password verification failed" });
        }
    } catch (error) {
        console.error('Login error:', error.name, error.message);
        console.error('Error stack:', error.stack);
        res.status(500).json({ msg: "Internal server error" });
    }
};

// Get User Data
export const Me = async (req, res) => {
    try {
        // Dynamic import of User model
        const { User } = await import("../../models/userModel.js");
        
        if (!req.session.user_id) {
            return res.status(401).json({ msg: "Mohon login ke akun anda" });
        }
        const user = await User.findOne({
            attributes: [
                'user_id',
                'fullname',
                'email',
                'role',
                'gender',
                'status',
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