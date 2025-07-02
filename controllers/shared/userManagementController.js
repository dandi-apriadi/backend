import db from "../../config/Database.js";
import argon2 from "argon2";

export const changePassword = async (req, res) => {
    let transaction;
    try {
        // Dynamic import of User model
        const { User } = await import("../../models/userModel.js");
        
        transaction = await db.transaction();

        const { oldPassword, newPassword } = req.body;
        const userId = req.user_id;

        if (!oldPassword || !newPassword) {
            return res.status(400).json({
                msg: 'Password lama dan baru harus diisi'
            });
        }

        const user = await User.findOne({
            where: { user_id: userId }
        });

        if (!user) {
            return res.status(404).json({
                msg: 'User tidak ditemukan'
            });
        }

        const validPassword = await argon2.verify(user.password, oldPassword);
        if (!validPassword) {
            return res.status(400).json({
                msg: 'Password lama tidak sesuai'
            });
        }

        const hashPassword = await argon2.hash(newPassword);

        await User.update({
            password: hashPassword
        }, {
            where: { user_id: userId },
            transaction
        });

        await transaction.commit();

        return res.status(200).json({
            msg: 'Password berhasil diperbarui'
        });

    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('Change password error:', error);
        return res.status(500).json({
            msg: 'Terjadi kesalahan pada server',
            error: error.message
        });
    }
};