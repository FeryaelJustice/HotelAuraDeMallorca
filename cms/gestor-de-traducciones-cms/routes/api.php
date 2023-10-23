<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

Route::get('', function () {
    return Response::json(['status' => 'success', 'message' => 'Working correctly'], 200);
});

Route::prefix('languages')->group(function () {
    Route::get('', [\App\Http\Controllers\LangController::class, 'getLanguages']);
});

Route::prefix('pages')->group(function () {
    Route::get('', [\App\Http\Controllers\PageController::class, 'getPages']);
});

Route::prefix('sections')->group(function () {
    Route::get('', [\App\Http\Controllers\SectionController::class, 'getSections']);
});

Route::prefix('translations')->group(function () {
    Route::post('create', [\App\Http\Controllers\TranslationsController::class, 'createTranslation']);
});
