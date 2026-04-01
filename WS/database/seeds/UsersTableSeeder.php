<?php

use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UsersTableSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        $email = env('ADMIN_EMAIL', 'admin@admin.local');
        $password = env('ADMIN_PASSWORD', bin2hex(random_bytes(12)));

        if (User::where('email', $email)->exists()) {
            return;
        }

        $model                    = User::create([
            'name'      => 'Administrator',
            'email'     => $email,
            'password'  => Hash::make($password),
            'admin'     => true,
            'api_token' => null,
        ]);
        $model->email_verified_at = Carbon::now();
        $model->save();

        $this->command->info("Admin user created: {$email}");
    }
}
