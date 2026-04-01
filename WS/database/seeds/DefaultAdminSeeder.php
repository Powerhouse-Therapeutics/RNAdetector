<?php

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DefaultAdminSeeder extends Seeder
{
    /**
     * Create a default admin user from environment variables.
     *
     * @return void
     */
    public function run(): void
    {
        $email = env('ADMIN_EMAIL', 'admin@admin');
        $password = env('ADMIN_PASSWORD', 'password123');

        $user = User::where('email', $email)->first();

        if (!$user) {
            User::create([
                'name'     => 'Administrator',
                'email'    => $email,
                'password' => Hash::make($password),
                'admin'    => true,
            ]);

            $this->command->info("Default admin user created: {$email}");
        } else {
            $this->command->info("Admin user already exists: {$email}");
        }
    }
}
