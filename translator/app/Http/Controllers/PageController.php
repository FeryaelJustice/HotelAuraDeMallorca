<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Response;
use App\Models\Page;
use Illuminate\Support\Facades\DB;

class PageController extends Controller
{
    public function getPages()
    {
        $pages = Page::orderBy("id")->get();
        return Response::json(['status' => 'success', 'data' => $pages], 200);
    }

    public function getPage($id)
    {
        $page = Page::find($id);
        return Response::json(['status' => 'success', 'data' => $page], 200);
    }

    public function getSectionPage($sectionID)
    {
        $page = DB::select("SELECT * FROM app_page p INNER JOIN section s ON p.id=s.app_page_id WHERE s.id=?", [$sectionID]);
        return Response::json(['status' => 'success', 'data' => $page], 200);
    }
}
