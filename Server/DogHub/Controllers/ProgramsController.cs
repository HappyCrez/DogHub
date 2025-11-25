using DogHub;
using Microsoft.AspNetCore.Mvc;

namespace DogHub.Controllers;

[ApiController]
[Route("programs")]
public class ProgramsController : ControllerBase
{
    private readonly DataBaseModel _db;
    private readonly SQLCommandManager _sql;

    public ProgramsController(DataBaseModel db, SQLCommandManager sql)
    {
        _db = db;
        _sql = sql;
    }

    // GET /programs
    [HttpGet]
    public IActionResult GetPrograms()
    {
        string sqlText = _sql.GetCommand("programs");
        string json = _db.ExecuteSQL(sqlText);
        return Content(json, "application/json");
    }

    // GET /programs/{programId}/dogs
    [HttpGet("{programId:int}/dogs")]
    public IActionResult GetProgramDogs(int programId)
    {
        string sqlText = _sql.GetCommand("program_dogs");
        var parameters = new Dictionary<string, object>
        {
            ["program_id"] = programId
        };
        string json = _db.ExecuteSQL(sqlText, parameters);
        return Content(json, "application/json");
    }
}
