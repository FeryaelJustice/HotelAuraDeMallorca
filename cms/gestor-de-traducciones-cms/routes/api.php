<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Response;

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
    Route::get('/{id}', [\App\Http\Controllers\PageController::class, 'getPage']);
});

Route::prefix('sections')->group(function () {
    Route::get('', [\App\Http\Controllers\SectionController::class, 'getSections']);
    Route::get('/{id}', [\App\Http\Controllers\SectionController::class, 'getSection']);
    Route::get('/pageSections/{pageId}', [\App\Http\Controllers\SectionController::class, 'getPageSections']);
});

Route::prefix('translations')->group(function () {
    Route::get('', [\App\Http\Controllers\TranslationsController::class, 'getAllTranslations']);
    Route::post('create', [\App\Http\Controllers\TranslationsController::class, 'createTranslation']);
    Route::get('/sectionLiterals/{sectionId}', [\App\Http\Controllers\TranslationsController::class, 'getSectionLiterals']);
});
