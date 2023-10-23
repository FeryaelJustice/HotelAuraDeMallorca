<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Response;
use App\Models\Section;

class SectionController extends Controller
{
    public function getSections()
    {
        $sections = Section::orderBy("section_name")->get();
        return Response::json(['status' => 'success', 'data' => $sections], 200);
    }
}
