using Microsoft.JSInterop;
using Microsoft.AspNetCore.Components.Web;
using Microsoft.AspNetCore.Components.WebAssembly.Hosting;
using UoMConverter.Wasm;

var builder = WebAssemblyHostBuilder.CreateDefault(args);

// Add a root component to ensure the Blazor app initializes correctly
builder.RootComponents.Add<HeadOutlet>("head::after");

var host = builder.Build();

var js = host.Services.GetRequiredService<IJSRuntime>();
await js.InvokeVoidAsync("registerUoMConverter", DotNetObjectReference.Create(new UoMConverterInterop()));

await host.RunAsync();
