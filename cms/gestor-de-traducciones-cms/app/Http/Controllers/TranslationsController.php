<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Response;
use App\Models\Literal;
use App\Models\Section;
use App\Models\Page;

class TranslationsController extends Controller
{
    public function createTranslation()
    {
        // $languages = Lang::orderBy("lang_name")->get();
        return Response::json(['status' => 'success', 'message' => 'Success!'], 200);
    }
}
