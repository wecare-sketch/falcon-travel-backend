import { AppDataSource } from "../config/db";
import { UserRole } from "../constants/enums";
import { User } from "../entities/user";
import bcrypt from "bcryptjs";

const UserRepository = AppDataSource.getRepository(User);

export async function createAdminUser() {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@falcontour.com";
  const password = process.env.ADMIN_PASSWORD || "supersecurepassword";

  const existingAdmin = await UserRepository.findOne({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = UserRepository.create({
      fullName: "Admin",
      email: adminEmail,
      password: hashedPassword,
      phoneNumber: "0000000000",
      dateOfBirth: "1970-01-01",
      role: UserRole.ADMIN,
    });

    await UserRepository.save(admin);
    console.log("Admin user created:", adminEmail);
  } else {
    console.log("Admin user already exists!");
  }
}
