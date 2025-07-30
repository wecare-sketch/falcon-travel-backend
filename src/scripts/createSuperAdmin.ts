import { AppDataSource } from "../config/db";
import { UserRole } from "../constants/enums";
import { User } from "../entities/user";
import bcrypt from "bcryptjs";

const UserRepository = AppDataSource.getRepository(User);

export async function createAdminUser() {
  const adminEmail = process.env.SUPER_ADMIN || "admin@falcontour.com";
  const password = process.env.SUPER_ADMIN_PASSWORD || "supersecurepassword";

  const existingAdmin = await UserRepository.findOne({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = UserRepository.create({
      fullName: "Super Admin",
      email: adminEmail,
      password: hashedPassword,
      phoneNumber: "0000000000",
      dateOfBirth: "1970-01-01",
      role: UserRole.SUPER_ADMIN,
    });

    await UserRepository.save(admin);
    console.log("Super Admin created:", adminEmail);
  } else {
    console.log("Super Admin already exists!");
  }
}
