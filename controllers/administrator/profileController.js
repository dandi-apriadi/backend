import argon2 from 'argon2';

/**
 * Handle password change request
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
export const changePassword = async (req, res) => {
    try {
        // Dynamic import of User model
        const { User } = await import('../../models/userModel.js');
        console.log("Change password request received");
        console.log("Session user_id:", req.session?.user_id);
        console.log("Middleware user_id:", req.user_id);
        console.log("Request body:", { ...req.body, currentPassword: "[REDACTED]", newPassword: "[REDACTED]" });

        const { currentPassword, newPassword, user_id } = req.body;

        // Validate request
        if (!currentPassword || !newPassword) {
            console.log("Missing password fields");
            return res.status(400).json({
                success: false,
                message: "Current password and new password are required"
            });
        }

        // Debug: Check if req.user_id is available from middleware
        if (!req.user_id) {
            console.error("req.user_id is undefined - middleware issue");
            return res.status(401).json({
                success: false,
                message: "Authentication required"
            });
        }

        // Make sure the user can only change their own password unless they're an admin
        if (req.user_id !== user_id && req.role !== 'admin') {
            console.log(`Authorization failed: ${req.user_id} tried to change password for ${user_id}`);
            return res.status(403).json({
                success: false,
                message: "You are not authorized to change this password"
            });
        }

        console.log(`Finding user with user_id: ${user_id}`);
        // Find the user
        const user = await User.findOne({
            where: {
                user_id: user_id
            }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Verify current password
        const validPassword = await argon2.verify(user.password, currentPassword);
        if (!validPassword) {
            return res.status(400).json({
                success: false,
                message: "Current password is incorrect"
            });
        }

        // Update the password
        // Note: Sequelize hooks will automatically hash the new password
        await user.update({
            password: newPassword
        });

        return res.status(200).json({
            success: true,
            message: "Password changed successfully"
        });
    } catch (error) {
        console.error("Error changing password:", error);
        return res.status(500).json({
            success: false,
            message: "An error occurred while changing the password"
        });
    }
};

/**
 * Get user profile information
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
export const getUserProfile = async (req, res) => {
    try {
        // Dynamic import of User model
        const { User } = await import('../../models/userModel.js');
        
        const user = await User.findOne({
            where: {
                user_id: req.user_id
            },
            attributes: ['user_id', 'fullname', 'email', 'role', 'gender', 'status', 'verified', 'created_at', 'updated_at']
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        return res.status(200).json({
            success: true,
            data: user
        });
    } catch (error) {
        console.error("Error fetching profile:", error);
        return res.status(500).json({
            success: false,
            message: "An error occurred while fetching profile data"
        });
    }
};