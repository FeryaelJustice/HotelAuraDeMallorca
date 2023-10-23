<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "web" middleware group. Make something great!
|
*/

Auth::routes();

Route::get('/{any?}', [App\Http\Controllers\HomeController::class, 'index'])->where('any', '.*')->where('any', '^(?!login|logout|register|api|languages).*'); // Exclude specific routes

// Route::get('/{any?}', function () {
//     return view('home');
// }) -> where('any', '.*');
