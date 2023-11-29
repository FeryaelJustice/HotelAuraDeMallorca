<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Response;
use App\Models\Lang;

class LangController extends Controller
{
    public function getLanguages()
    {
        $languages = Lang::orderBy("lang_name")->get();
        return Response::json(['status' => 'success', 'data' => $languages], 200);
    }
}
