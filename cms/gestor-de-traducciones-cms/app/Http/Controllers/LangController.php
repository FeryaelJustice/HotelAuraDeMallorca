<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Lang;
use Illuminate\Support\Facades\Response;

class LangController extends Controller
{
    public function getLanguages()
    {
        $languages = Lang::orderBy("lang_name")->get();
        return Response::json(['status' => 'success', 'data' => $languages], 200);
    }
}
