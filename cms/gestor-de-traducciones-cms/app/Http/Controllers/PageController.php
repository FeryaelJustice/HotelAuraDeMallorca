<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Response;
use App\Models\Page;

class PageController extends Controller
{
    public function getPages()
    {
        $pages = Page::orderBy("app_page_name")->get();
        return Response::json(['status' => 'success', 'data' => $pages], 200);
    }

    public function getPage($id)
    {
        $page = Page::find($id);
        return Response::json(['status' => 'success', $page], 200);
    }
}
