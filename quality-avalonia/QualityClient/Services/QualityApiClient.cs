using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace QualityClient.Services;

public record InspectionDto(
    string Id,
    string? ErpnextName,
    string InspectionType,
    string ItemCode,
    string? ItemName,
    string Status,
    string CreatedBy,
    DateTime CreatedAt,
    List<InspectionItemDto> Items
);

public record InspectionItemDto(
    string Id,
    string Parameter,
    double? MinValue,
    double? MaxValue,
    double? ActualValue,
    string? Status
);

public record ApprovalRequestDto(
    string Id,
    string InspectionId,
    string RequestedBy,
    DateTime RequestedAt,
    string Status,
    string Priority,
    string? Notes,
    List<ApprovalDecisionDto> Decisions
);

public record ApprovalDecisionDto(
    string Id,
    string RequestId,
    string DecidedBy,
    DateTime DecidedAt,
    string Decision,
    string? Comments
);

public record AuditLogDto(
    string Id,
    DateTime Timestamp,
    string Actor,
    string Action,
    string ResourceType,
    string? ResourceId,
    string Result
);

public class QualityApiClient
{
    private readonly HttpClient _http;
    private static readonly JsonSerializerOptions _opts = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    public QualityApiClient(string baseUrl)
    {
        _http = new HttpClient { BaseAddress = new Uri(baseUrl) };
    }

    public async Task<List<InspectionDto>> GetInspectionsAsync(string? status = null)
    {
        var url = "/api/v1/inspections/" + (status != null ? $"?status={status}" : "");
        return await _http.GetFromJsonAsync<List<InspectionDto>>(url, _opts) ?? [];
    }

    public async Task<InspectionDto?> GetInspectionAsync(string id)
        => await _http.GetFromJsonAsync<InspectionDto>($"/api/v1/inspections/{id}", _opts);

    public async Task<List<ApprovalRequestDto>> GetApprovalsAsync(string? status = null)
    {
        var url = "/api/v1/approvals/" + (status != null ? $"?status={status}" : "");
        return await _http.GetFromJsonAsync<List<ApprovalRequestDto>>(url, _opts) ?? [];
    }

    public async Task<ApprovalRequestDto?> ApproveAsync(string requestId, string decidedBy, string? comments)
    {
        var body = new { decided_by = decidedBy, decision = "approved", comments };
        var resp = await _http.PostAsJsonAsync($"/api/v1/approvals/{requestId}/approve", body, _opts);
        resp.EnsureSuccessStatusCode();
        return await resp.Content.ReadFromJsonAsync<ApprovalRequestDto>(_opts);
    }

    public async Task<ApprovalRequestDto?> RejectAsync(string requestId, string decidedBy, string? comments)
    {
        var body = new { decided_by = decidedBy, decision = "rejected", comments };
        var resp = await _http.PostAsJsonAsync($"/api/v1/approvals/{requestId}/reject", body, _opts);
        resp.EnsureSuccessStatusCode();
        return await resp.Content.ReadFromJsonAsync<ApprovalRequestDto>(_opts);
    }

    public async Task<List<AuditLogDto>> GetAuditLogsAsync(int limit = 100)
        => await _http.GetFromJsonAsync<List<AuditLogDto>>($"/api/v1/audits/?limit={limit}", _opts) ?? [];
}
